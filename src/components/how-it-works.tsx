import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function HowItWorks() {
  return (
    <div className="glass rounded-2xl px-5">
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="composer">
          <AccordionTrigger>Query</AccordionTrigger>
          <AccordionContent>
            <p>A query becomes Marketplace steps with a USDC price on each hop.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="wallet">
          <AccordionTrigger>Wallet</AccordionTrigger>
          <AccordionContent>
            <p>A Circle agent wallet holds USDC and signs x402 nanopayments.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="x402">
          <AccordionTrigger>x402</AccordionTrigger>
          <AccordionContent>
            <p>
              Official buyer path: inspect → estimate → pay. Chain comes from
              the seller&apos;s accepts[], method from inspect (-X). Gateway
              nanopayments are first-class.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="demo">
          <AccordionTrigger>Demo</AccordionTrigger>
          <AccordionContent>
            <p>Demo Mode always succeeds. Live mode uses Discovery + Circle CLI.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
