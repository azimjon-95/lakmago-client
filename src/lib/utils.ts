export function formatSom(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

export function formatSomShort(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export function buildOptionKey(dishId: string, optionIds: string[]): string {
  return `${dishId}__${optionIds.sort().join('-')}`;
}
