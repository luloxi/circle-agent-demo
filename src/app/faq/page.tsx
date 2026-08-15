import type { Metadata } from "next";
import { FaqPage } from "@/components/faq-page";

export const metadata: Metadata = {
  title: "FAQ — Agent Query Composer",
  description:
    "What Agent Query Composer is: Circle Agent Wallet, Marketplace, x402 nanopayments, and Arc Testnet.",
};

export default function Faq() {
  return <FaqPage />;
}
