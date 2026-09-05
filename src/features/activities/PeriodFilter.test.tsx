import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { getPeriodRange, BEGINNING_OF_TIME } from '@/lib/periods'
import { PeriodFilter } from './PeriodFilter'

describe('PeriodFilter', () => {
  it('показывает поля дат только для своего периода', () => {
    // Для готовых вариантов даты выбраны за человека,
    // и редактируемые поля рядом только сбивали бы с толку.
    const { rerender } = renderWithProviders(
      <PeriodFilter period="thisWeek" range={getPeriodRange('thisWeek')} onChange={() => {}} />,
    )
    expect(screen.queryByLabelText('С')).not.toBeInTheDocument()

    rerender(
      <PeriodFilter period="custom" range={getPeriodRange('thisWeek')} onChange={() => {}} />,
    )
    expect(screen.getByLabelText('С')).toBeInTheDocument()
  })

  it('предлагает «Всё время» и «Последние 12 месяцев»', () => {
    renderWithProviders(
      <PeriodFilter period="thisWeek" range={getPeriodRange('thisWeek')} onChange={() => {}} />,
    )

    expect(screen.getByRole('option', { name: 'Всё время' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Последние 12 месяцев' })).toBeInTheDocument()
  })

  it('после «Всего времени» свой период НЕ начинается с технической даты', () => {
    // Нижняя граница «всего времени» — 2000 год. Она нужна запросу
    // к базе, но в поле «С» выглядит как взявшийся ниоткуда год
    // и заставляет гадать, откуда он.
    const onChange = vi.fn()
    renderWithProviders(
      <PeriodFilter
        period="allTime"
        range={getPeriodRange('allTime')}
        onChange={onChange}
      />,
    )

    return userEvent
      .setup()
      .selectOptions(screen.getByLabelText('Период'), 'custom')
      .then(() => {
        const [, range] = onChange.mock.calls[0]
        expect(range.from).not.toBe(BEGINNING_OF_TIME)
        expect(range.from).toBe(getPeriodRange('thisMonth').from)
        // Верхнюю границу сохраняем: она и так осмысленная.
        expect(range.to).toBe(getPeriodRange('allTime').to)
      })
  })

  it('с обычного периода даты переносятся как есть', () => {
    // Поправить обычно нужно только одну границу — терять вторую жаль.
    const onChange = vi.fn()
    const range = getPeriodRange('lastMonth')

    renderWithProviders(
      <PeriodFilter period="lastMonth" range={range} onChange={onChange} />,
    )

    return userEvent
      .setup()
      .selectOptions(screen.getByLabelText('Период'), 'custom')
      .then(() => {
        expect(onChange.mock.calls[0][1]).toEqual(range)
      })
  })
})
