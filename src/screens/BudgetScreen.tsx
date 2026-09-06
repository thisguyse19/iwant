import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp, useBudgetSummary } from '../store'
import { ItemRow } from '../components/ItemRow'
import { Sheet } from '../components/Sheet'
import { formatPrice } from '../utils'
import '../components/ItemRow.css'
import './BudgetScreen.css'

export function BudgetScreen() {
  const { settings, updateSettings, setViewingItem, updateItem, removeItem } = useApp()
  const summary = useBudgetSummary()
  const [editOpen, setEditOpen] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const openEdit = () => {
    setBudgetInput(summary.budget > 0 ? summary.budget.toString() : '')
    setEditOpen(true)
  }

  const saveBudget = async () => {
    const value = parseFloat(budgetInput)
    if (!isNaN(value) && value >= 0) {
      await updateSettings({ monthlyBudget: value })
    }
    setEditOpen(false)
  }

  const barPercent = summary.hasBudget
    ? Math.min(100, (summary.listTotal / summary.budget) * 100)
    : 0

  const remainderLabel = !summary.hasBudget
    ? 'Set a monthly budget'
    : summary.remainder >= 0
      ? `${formatPrice(summary.remainder, settings.currency)} left`
      : `${formatPrice(Math.abs(summary.remainder), settings.currency)} over`

  const dock = (
    <div className="budget-dock" aria-label="Budget summary">
      <div className="budget-hero">
        <div className="budget-amount" style={{ color: summary.remainder < 0 ? 'var(--destructive)' : undefined }}>
          {summary.hasBudget ? formatPrice(Math.abs(summary.remainder), settings.currency) : '—'}
        </div>
        <div className="budget-label">{remainderLabel}</div>

        {summary.hasBudget && (
          <div className="budget-bar" aria-hidden="true">
            <div className="budget-bar-fill" style={{ width: `${barPercent}%` }} />
          </div>
        )}

        <button type="button" className="text-btn budget-edit-btn" onClick={openEdit}>
          {summary.hasBudget ? 'Edit budget' : 'Set budget'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="screen screen-budget">
        <header className="screen-header">
          <h1 className="screen-title">Budget</h1>
        </header>

        <div className="budget-scroll">
          {summary.hasBudget && (
            <div className="budget-stats">
              <div className="budget-stat-row">
                <span>On your list</span>
                <span>{formatPrice(summary.listTotal, settings.currency)}</span>
              </div>
              {summary.unpriced > 0 && (
                <p className="warning-text">
                  {summary.unpriced} item{summary.unpriced > 1 ? 's' : ''} without a price
                </p>
              )}
            </div>
          )}

          {summary.affordable.length > 0 && (
            <section className="budget-section">
              <h2 className="section-label">Affordable now</h2>
              <div className="item-list">
                {summary.affordable.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onTap={() => setViewingItem(item)}
                    onMarkBought={() => updateItem(item.id, { status: 'bought' })}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {summary.active.length > 0 && summary.affordable.length === 0 && summary.hasBudget && (
            <section className="budget-section">
              <h2 className="section-label">Your list</h2>
              <div className="item-list">
                {summary.active.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onTap={() => setViewingItem(item)}
                    onMarkBought={() => updateItem(item.id, { status: 'bought' })}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {createPortal(dock, document.body)}

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Monthly budget">
        <div className="field">
          <label htmlFor="budget-amount">Amount ({settings.currency})</label>
          <input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
        </div>
        <button type="button" className="primary-btn" onClick={saveBudget}>
          Save
        </button>
      </Sheet>
    </>
  )
}
