import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  // Each page can set its own title, e.g. "Carriers · LoadWise"
  title: {
    default: "LoadWise",
    template: "%s · LoadWise",
  },
  description:
    "Smart Load Matching & Dispatch Management System for Small Trucking Carriers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
