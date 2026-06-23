import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { prisma } from './config/prisma';

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// ROTAS BASE
// ==========================================

app.get('/', async (_req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      status: 'online',
      mensagem: 'Backend da Catchup Platform a funcionar a 100%!',
      utilizadores_registados: userCount
    });
  } catch (error) {
    res.status(500).json({ status: 'erro', detalhe: 'Erro ao ligar à base de dados' });
  }
});

app.get('/settings/current-theme', async (_req: Request, res: Response) => {
  try {
    let config = await prisma.setting.findUnique({
      where: { id: 'GLOBAL' }
    });

    if (!config) {
      config = await prisma.setting.create({
        data: {
          id: 'GLOBAL',
          activeTheme: 'default',
          particles: 'none'
        }
      });
    }

    return res.json({
      success: true,
      theme: config.activeTheme,
      particles: config.particles,
      lastUpdated: config.updatedAt
    });
  } catch (error) {
    console.error('Erro ao buscar o tema atual:', error);
    return res.status(500).json({ error: 'Erro interno a carregar configurações visuais' });
  }
});

app.post('/users/credit', async (req: Request, res: Response) => {
  const { userId, amount } = req.body;

  if (!userId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Por favor, fornece um userId válido e um valor (amount) maior que zero.'
    });
  }

  const CASHBACK_RATE = 0.10;
  const cashbackEarned = amount * CASHBACK_RATE;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
          cashback: { increment: cashbackEarned }
        }
      });

      const transactionRecord = await tx.transaction.create({
        data: {
          userId,
          amount,
          type: 'PIX_CREDIT_PURCHASE'
        }
      });

      return { updatedUser, transactionRecord };
    });

    return res.json({
      success: true,
      message: 'Créditos e Cashback aplicados com sucesso!',
      depositAmount: amount,
      cashbackEarned: Number(cashbackEarned.toFixed(2)),
      newBalance: Number(result.updatedUser.balance.toFixed(2)),
      newTotalCashback: Number(result.updatedUser.cashback.toFixed(2)),
      transactionId: result.transactionRecord.id
    });
  } catch (error) {
    console.error('Erro na transação de crédito:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar a transação financeira.'
    });
  }
});

// ==========================================
// MOTOR DE GAMIFICAÇÃO (ANTI-CHEAT)
// ==========================================

const GAME_CONFIG: Record<string, { maxDurationSeconds: number; maxCoinsPerSecond: number }> = {
  'coin-collector': { maxDurationSeconds: 30, maxCoinsPerSecond: 3 },
  'quick-tap':      { maxDurationSeconds: 60, maxCoinsPerSecond: 2 },
  'puzzle':         { maxDurationSeconds: 120, maxCoinsPerSecond: 1 },
};

function generateGameHash(userId: string, gameId: string, startedAt: number): string {
  const secret = process.env.GAME_SECRET ?? 'fallback_secret';
  const payload = `${userId}:${gameId}:${startedAt}:${secret}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

app.post('/games/start', async (req: Request, res: Response) => {
  const { userId, gameId } = req.body;

  if (!userId || !gameId) {
    return res.status(400).json({ success: false, error: 'userId e gameId são obrigatórios.' });
  }

  if (!GAME_CONFIG[gameId]) {
    return res.status(400).json({ success: false, error: `Mini-jogo '${gameId}' não reconhecido.` });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ success: false, error: 'Utilizador não encontrado.' });
  }

  const startedAt = Date.now();
  const sessionToken = generateGameHash(userId, gameId, startedAt);

  return res.json({
    success: true,
    sessionToken,
    startedAt,
    gameConfig: GAME_CONFIG[gameId],
    message: 'Partida iniciada. Guarda o sessionToken para submeter o resultado!'
  });
});

app.post('/games/reward', async (req: Request, res: Response) => {
  const { userId, gameId, earnedCoins, sessionToken, startedAt } = req.body;

  if (!userId || !gameId || !sessionToken || !startedAt || typeof earnedCoins !== 'number') {
    return res.status(400).json({ success: false, error: 'Payload incompleto.' });
  }

  const config = GAME_CONFIG[gameId];
  if (!config) {
    return res.status(400).json({ success: false, error: 'Mini-jogo inválido.' });
  }

  // ANTI-CHEAT 1: Validar hash criptográfico
  const expectedToken = generateGameHash(userId, gameId, startedAt);
  if (sessionToken !== expectedToken) {
    console.warn(`🚨 TENTATIVA DE CHEAT DETETADA: userId=${userId} gameId=${gameId}`);
    return res.status(403).json({ success: false, error: 'Token de sessão inválido.' });
  }

  // ANTI-CHEAT 2: Validar tempo de jogo plausível
  const elapsedSeconds = (Date.now() - startedAt) / 1000;

  if (elapsedSeconds < 3) {
    return res.status(400).json({ success: false, error: 'Partida demasiado curta para ser válida.' });
  }

  if (elapsedSeconds > config.maxDurationSeconds * 2) {
    return res.status(400).json({ success: false, error: 'Sessão de jogo expirada.' });
  }

  // ANTI-CHEAT 3: Validar se as moedas são fisicamente possíveis
  const maxPossibleCoins = Math.ceil(elapsedSeconds * config.maxCoinsPerSecond);
  if (earnedCoins > maxPossibleCoins) {
    console.warn(`🚨 COINS IMPOSSÍVEIS: userId=${userId} pediu ${earnedCoins}, máximo possível=${maxPossibleCoins}`);
    return res.status(400).json({
      success: false,
      error: `Resultado impossível. Máximo alcançável: ${maxPossibleCoins} moedas.`
    });
  }

  if (earnedCoins < 0) {
    return res.status(400).json({ success: false, error: 'earnedCoins não pode ser negativo.' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: earnedCoins } }
    });

    await prisma.transaction.create({
      data: {
        userId,
        amount: earnedCoins,
        type: `GAME_REWARD:${gameId}`
      }
    });

    console.log(`✅ Recompensa válida: userId=${userId} gameId=${gameId} coins=${earnedCoins}`);

    return res.json({
      success: true,
      message: `Parabéns! Ganhaste ${earnedCoins} moedas no ${gameId}!`,
      earnedCoins,
      newBalance: Number(updatedUser.balance.toFixed(2)),
      elapsedSeconds: Math.round(elapsedSeconds)
    });
  } catch (error) {
    console.error('Erro ao processar recompensa:', error);
    return res.status(500).json({ success: false, error: 'Erro interno ao registar recompensa.' });
  }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor TypeScript rodando em http://localhost:${PORT}`);
});