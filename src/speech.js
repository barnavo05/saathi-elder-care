/**
 * Read aloud, for elders who find small text hard. Uses the browser's built in
 * speech synthesis, so no audio or text leaves the device.
 */

export const canSpeak = () =>
  typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

/** Speak a sentence. Returns false when speech is not available. */
export function speak(text) {
  if (!canSpeak()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
  return true;
}
