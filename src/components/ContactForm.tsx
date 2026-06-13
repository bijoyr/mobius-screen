"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconCheck, IconMail } from "@tabler/icons-react";

const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID;
const CONTACT_EMAIL = "bijoyr@trinfac.com";

type State = "idle" | "sending" | "sent" | "error";

/** "Contact Us for Login Details" — requests access via Formspree (which emails
 *  CONTACT_EMAIL). Falls back to a mailto: link if no Formspree id is configured. */
export function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<State>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!FORMSPREE_ID) {
      const subject = encodeURIComponent("Mobius-Screen — access request");
      const body = encodeURIComponent(
        `Please grant me access to Mobius-Screen.\n\nMy email: ${email}\n\n${message}`,
      );
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      return;
    }

    setState("sending");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          message,
          _subject: "Mobius-Screen — access request",
        }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <Alert color="canary" icon={<IconCheck size={16} />} variant="light">
        Thanks! Your request was sent. We&apos;ll email your login to{" "}
        <b>{email}</b> shortly.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          Don&apos;t have access yet? Send your email and we&apos;ll set up a login
          for you.
        </Text>
        <TextInput
          required
          type="email"
          label="Your email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <Textarea
          label="Message (optional)"
          placeholder="A bit about how you'd like to use Mobius-Screen…"
          autosize
          minRows={2}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
        />
        {state === "error" && (
          <Text size="xs" c="red">
            Couldn&apos;t send right now — please email {CONTACT_EMAIL} directly.
          </Text>
        )}
        <Button
          type="submit"
          variant="light"
          leftSection={<IconMail size={16} />}
          loading={state === "sending"}
        >
          Contact us for login details
        </Button>
      </Stack>
    </form>
  );
}
