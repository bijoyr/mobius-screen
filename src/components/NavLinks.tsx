"use client";

import { Button, type ButtonProps } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";

interface NavButtonProps extends ButtonProps {
  href: string;
  children: ReactNode;
}

export function NavButton({ href, children, ...rest }: NavButtonProps) {
  return (
    <Button component={Link} href={href} {...rest}>
      {children}
    </Button>
  );
}
