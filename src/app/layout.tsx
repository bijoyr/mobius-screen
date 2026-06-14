import type { Metadata } from "next";
import Script from "next/script";
import { Manrope } from "next/font/google";
import { MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "mantine-datatable/styles.css";
import "./globals.css";
import { theme } from "@/theme";
import { AppShellLayout } from "@/components/AppShellLayout";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mobius-Screen — AI Equities Screener",
  description:
    "AI equities screener (NSE F&O + US S&P 500) powered by Nebius AI — macro-thematic + Elliott-Wave stock picks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps} className={manrope.variable}>
      <head>
        <Script id="mantine-color-scheme" strategy="beforeInteractive">
          {`try {
  var _cs = window.localStorage.getItem("mantine-color-scheme-value");
  var cs = _cs === "light" || _cs === "dark" || _cs === "auto" ? _cs : "dark";
  var ccs = cs !== "auto" ? cs : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-mantine-color-scheme", ccs);
} catch (e) {}`}
        </Script>
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <Notifications position="top-right" />
          <SessionProviderWrapper>
            <AppShellLayout>{children}</AppShellLayout>
          </SessionProviderWrapper>
        </MantineProvider>
      </body>
    </html>
  );
}
