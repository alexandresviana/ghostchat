/** Horários exibidos em GMT-3 (Brasil — São Paulo, sem DST desde 2019). */

export const BRASILIA_TZ = "America/Sao_Paulo";

const dateTimeOpts: Intl.DateTimeFormatOptions = {
  timeZone: BRASILIA_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const timeOnlyOpts: Intl.DateTimeFormatOptions = {
  timeZone: BRASILIA_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

export function formatDateTimePtBr(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", dateTimeOpts);
}

/** Hora HH:MM no fuso de Brasília a partir de um instante (ms). */
export function formatClockPtBr(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", timeOnlyOpts);
}
