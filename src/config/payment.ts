/**
 * Taklifim To'lov Sozlamalari (Single Source of Truth)
 * Barcha karta va to'lov ma'lumotlari faqat shu faylda saqlanadi.
 */

export const PAYMENT_CONFIG = {
  // Karta raqami (proba bilan va probasiz)
  cardNumberRaw: '5614682209202581',
  cardNumberFormatted: '5614 6822 0920 2581',
  
  // Qabul qiluvchi
  cardHolder: 'ABDULLA DEDAXANOV',
  
  // Bank / Tizim
  cardBank: 'Uzcard / Humo',
  
  // Yo'riqnoma va Ogohlantirishlar
  instructionText: "Yuqoridagi kartaga summani o'tkazing, keyin to'lov cheki (skrinshot yoki PDF) faylini yuklang.",
  warningText: "To'lov summasi va sana chekda aniq ko'rinsin. Admin tekshiruvidan so'ng taklifnomangiz faollashadi.",
};
