export function formatWhatsAppNumber(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";

  // Already normalized for Argentina without '+'
  if (digits.startsWith("549")) return digits;

  // Example: 0351... -> 351... then add 549
  if (digits.startsWith("0")) {
    return `549${digits.slice(1)}`;
  }

  // Example: 3511234567 (10 digits) -> 5493511234567
  if (digits.length === 10) {
    return `549${digits}`;
  }

  // Example: 93511234567 (11 digits starting with 9) -> 54 + digits
  if (digits.length === 11 && digits.startsWith("9")) {
    return `54${digits}`;
  }

  // Fallback: assume caller already provided a usable international number.
  return digits;
}

export function buildWhatsAppUrl(phone, text) {
  const number = formatWhatsAppNumber(phone);
  if (!number) return "";
  const message = encodeURIComponent(
    text || "Hola, soy el repartidor de Ronda. Estoy pasando por tu domicilio."
  );
  return `https://wa.me/${number}?text=${message}`;
}

