import React from "react";
import { Text, TextProps } from "react-native";
import { useSpeakOnPress, NO_SELECT_WEB } from "@/src/accessibility";

/**
 * Texto audiodescritível: drop-in para <Text>. Ao SEGURAR (onLongPress), com o toggle
 * "Audiodescrição" ligado, fala o próprio texto exibido — via o mecanismo existente
 * (useSpeakOnPress → speak → ttsLocale do idioma atual, gating pelo toggle e guarda de
 * leitor de tela). O TOQUE simples não faz nada. No web aplica NO_SELECT_WEB para que
 * segurar não selecione texto nem abra o menu de contexto.
 *
 * REGRA DE OURO: passe SEMPRE texto já no idioma atual como children (ou via `speakText`).
 * O que é falado vem de `speakText` quando informado; senão, do próprio children textual.
 */
export function SpeakableText({
  children,
  speakText,
  style,
  ...rest
}: TextProps & { speakText?: string }) {
  const speakOnPress = useSpeakOnPress();
  const text = (speakText ?? flattenText(children)).trim();
  return (
    <Text
      {...rest}
      style={[style, NO_SELECT_WEB]}
      onLongPress={() => speakOnPress(text)}
    >
      {children}
    </Text>
  );
}

// Achata children (string, número, arrays e <Text> aninhados) num texto plano para fala.
function flattenText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (React.isValidElement(node)) return flattenText((node.props as any)?.children);
  return "";
}
