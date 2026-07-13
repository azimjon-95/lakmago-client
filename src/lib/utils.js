export function formatSom(value) {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

export function formatSomShort(value) {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export function buildOptionKey(dishId, optionIds) {
  return `${dishId}__${optionIds.sort().join('-')}`;
}
