import "dotenv/config";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const conn = new Connection(process.env.RPC_ENDPOINT);
const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.WALLET_PRIVATE_KEY)
);
const balance = await conn.getBalance(wallet.publicKey);
const solBalance = balance / 1e9;

console.log("Wallet:", wallet.publicKey.toBase58());
console.log("Balance:", solBalance.toFixed(4), "SOL");
console.log(
  "Min Position:",
  process.env.MIN_POSITION_SIZE_SOL || "0.006",
  "SOL"
);
console.log(
  "Max Positions:",
  Math.floor(
    solBalance / parseFloat(process.env.MIN_POSITION_SIZE_SOL || 0.006)
  )
);
console.log(
  solBalance > 0.006
    ? "\n✅ Ready for live trading!"
    : "\n❌ Insufficient balance"
);
