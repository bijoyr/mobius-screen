import type { Metadata } from "next";
import Script from "next/script";
import { MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "mantine-datatable/styles.css";
import "./globals.css";
import { AppShellLayout } from "@/components/AppShellLayout";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";

export const metadata: Metadata = {
  title: "NSE F&O Screener",
  description: "Personal NSE F&O stock screener powered by Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <Script id="mantine-color-scheme" strategy="beforeInteractive">
          {`try {
  var _cs = window.localStorage.getItem("mantine-color-scheme-value");
  var cs = _cs === "light" || _cs === "dark" || _cs === "auto" ? _cs : "auto";
  var ccs = cs !== "auto" ? cs : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-mantine-color-scheme", ccs);
} catch (e) {}`}
        </Script>
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto">
          <Notifications position="top-right" />
          <SessionProviderWrapper>
            <AppShellLayout>{children}</AppShellLayout>
          </SessionProviderWrapper>
        </MantineProvider>
      </body>
    </html>
  );
}
