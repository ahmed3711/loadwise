import Link from "next/link";
import { buttonStyles } from "./Button";

// A link that looks like a button (e.g. "+ Add carrier")
export default function LinkButton({ href, variant = "primary", className = "", children }) {
  return (
    <Link href={href} className={`${buttonStyles(variant)} ${className}`}>
      {children}
    </Link>
  );
}
