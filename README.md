Fidelidade Gamificada

Bem-vindo ao repositório, um sistema inovador que une a experiência física de máquinas de brindes (máquinas de urso) com um ecossistema digital de fidelidade e gamificação.

---

## 🚀 O Projeto

O **projeto** transforma a interação tradicional com máquinas de brindes numa experiência conectada. Os utilizadores podem comprar créditos, ganhar cashback e participar em mini-jogos dentro da aplicação, mantendo o engajamento mesmo fora do local físico.

### Principais Funcionalidades
* **Gestão de Créditos:** Compra de saldo digital para interagir com máquinas físicas.
* **Integração Física:** Validação segura através de QR Code para ativar as máquinas (controladas por ESP32).
* **Sistema de Fidelidade:** Acúmulo de cashback a cada transação.
* **Gamificação:** Mini-jogos integrados no app para retenção e ganho de bónus.

---

## 🛠 Stack Tecnológica

Optámos por uma stack unificada em **TypeScript** para maior produtividade e escalabilidade:

* **Backend:** Node.js com TypeScript e Prisma ORM.
* **Frontend Mobile:** React Native (com Expo) para Android e iOS.
* **Banco de Dados:** PostgreSQL para garantir a segurança e integridade das transações.
* **Integração de Hardware:** ESP32 (Microcontrolador) para o controlo mecânico.

---

## 🏗 Arquitetura do Sistema

1.  **App Mobile:** Interface do utilizador para gestão de saldo e jogos.
2.  **API Backend:** Processamento de pagamentos e validação de requisições.
3.  **Hardware (ESP32):** Interface HMI na máquina física que recebe o sinal de autorização via API.

---

## 📊 Status do Projeto

- [x] Definição de requisitos e escopo (MVP).
- [x] Configuração inicial do ambiente de desenvolvimento.
- [x] Transição para TypeScript.
- [ ] Implementação do banco de dados (PostgreSQL + Prisma).
- [ ] Desenvolvimento dos endpoints de transação.
- [ ] Prototipagem da interface de jogos.
- [ ] Integração final com ESP32.

---

---
*Desenvolvido por @Erick Saraiva*
*full stack*
README.md
Exibindo README.md.
