"use client";

import { useForm, ValidationError } from "@formspree/react";
import { Alert, Button, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { IconCheck, IconMail } from "@tabler/icons-react";

// Formspree form ids are public by design (they live in the client form action),
// so the owner's id is a safe default; forks can override via env.
const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID || "xlgkozzo";

/** "Contact Us for Login Details" — submits an access request via Formspree,
 *  which emails the form owner (bijoyr@trinfac.com). */
export function ContactForm() {
  const [state, handleSubmit] = useForm(FORMSPREE_ID);

  if (state.succeeded) {
    return (
      <Alert color="canary" icon={<IconCheck size={16} />} variant="light">
        Thanks! Your request was sent — we&apos;ll email your login shortly.
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
          name="email"
          label="Your email"
          placeholder="you@example.com"
        />
        <ValidationError field="email" prefix="Email" errors={state.errors} />
        <Textarea
          name="message"
          label="Message (optional)"
          placeholder="A bit about how you'd like to use Mobius-Screen…"
          autosize
          minRows={2}
        />
        <ValidationError field="message" prefix="Message" errors={state.errors} />
        <ValidationError errors={state.errors} />
        <Button
          type="submit"
          variant="light"
          leftSection={<IconMail size={16} />}
          loading={state.submitting}
          disabled={state.submitting}
        >
          Contact us for login details
        </Button>
      </Stack>
    </form>
  );
}
