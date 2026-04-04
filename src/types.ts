export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
}

export const CATEGORIES = {
  income: [
    'Основной',
    'Копир',
    'Карты СКЗИ',
    'Meilleur',
    'Сим-карты',
    'Субаренда',
    'Займ'
  ],
  expense: [
    'ФОТ персонал',
    'ФООТ ИП',
    'Налоги персонал',
    'Налоги ИП',
    'Аренда',
    'Коммуналка',
    'Расх. мат-лы: рабочий процесс',
    'Расх. мат-лы: хоз. Нужды',
    'Ремонт оборудования',
    'Мобильн. Связь',
    'Расчеты с контрагентами',
    'Питание',
    'Маркетинг, реклама',
    'Подарки',
    'Возврат займа'
  ]
};
