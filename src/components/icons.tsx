import Image from "next/image";

export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Image src="/images/icon-google.svg" alt="Google" width={size} height={size} />
  );
}

export function ArrowWhiteIcon() {
  return (
    <Image src="/images/arrow-white.svg" alt="" width={15} height={15} />
  );
}

export function FactsIcon1() {
  return <Image src="/images/icon-facts-counter-1.svg" alt="" width={50} height={51} />;
}
export function FactsIcon2() {
  return <Image src="/images/icon-facts-counter-2.svg" alt="" width={51} height={51} />;
}
export function FactsIcon3() {
  return <Image src="/images/icon-facts-counter-3.svg" alt="" width={51} height={51} />;
}
export function FactsIcon4() {
  return <Image src="/images/icon-facts-counter-4.svg" alt="" width={51} height={51} />;
}

export function HowWorkIcon1() {
  return <Image src="/images/icon-how-work-step-1.svg" alt="" width={34} height={35} />;
}
export function HowWorkIcon2() {
  return <Image src="/images/icon-how-work-step-2.svg" alt="" width={34} height={35} />;
}
export function HowWorkIcon3() {
  return <Image src="/images/icon-how-work-step-3.svg" alt="" width={34} height={35} />;
}
export function HowWorkIcon4() {
  return <Image src="/images/icon-how-work-step-4.svg" alt="" width={34} height={35} />;
}
