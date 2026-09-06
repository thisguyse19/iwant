import { useState } from 'react'
import { useApp, useBudgetSummary } from '../store'
import { ItemRow } from '../components/ItemRow'
import { Sheet } from '../components/Sheet'
import { formatPrice } from '../utils'
import '../components/ItemRow.css'

export function BudgetScreen() {
  const { settings, updateSettings, setViewingItem, updateItem } = useApp()
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
    ? Math.min(100, (summary.readyTotal / summary.budget) * 100)
    : 0

  const queuedBarPercent = summary.hasBudget
    ? Math.min(100 - barPercent, (summary.queuedTotal / summary.budget) * 100)
    : 0

  const remainderLabel = !summary.hasBudget
    ? 'Set a monthly budget'
    : summary.remainder >= 0
      ? `${formatPrice(summary.remainder, settings.currency)} left`
      : `${formatPrice(Math.abs(summary.remainder), settings.currency)} over`

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Budget</h1>
      </header>

      <div className="budget-hero">
        <div className="budget-amount" style={{ color: summary.remainder < 0 ? 'var(--destructive)' : undefined }}>
          {summary.hasBudget ? formatPrice(Math.abs(summary.remainder), settings.currency) : '—'}
        </div>
        <div className="budget-label">{remainderLabel}</div>

        {summary.hasBudget && (
          <div className="budget-bar" aria-hidden="true">
            <div className="budget-bar-fill" style={{ width: `${barPercent}%` }} />
            {queuedBarPercent > 0 && (
              <div className="budget-bar-fill queued" style={{ width: `${queuedBarPercent}%` }} />
            )}
          </div>
        )}

        <button type="button" className="text-btn" style={{ marginTop: 16 }} onClick={openEdit}>
          {summary.hasBudget ? 'Edit budget' : 'Set budget'}
        </button>
      </div>

      {summary.hasBudget && (
        <>
          <div className="budget-stat-row">
            <span>Ready to buy</span>
            <span>{formatPrice(summary.readyTotal, settings.currency)}</span>
          </div>
          <div className="budget-stat-row">
            <span>Still queued</span>
            <span>{formatPrice(summary.queuedTotal, settings.currency)}</span>
          </div>
          {(summary.unpricedReady > 0 || summary.unpricedQueued > 0) && (
            <p className="warning-text">
              {summary.unpricedReady + summary.unpricedQueued} item
              {summary.unpricedReady + summary.unpricedQueued > 1 ? 's' : ''} without a price
            </p>
          )}
        </>
      )}

      {summary.affordable.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 className="section-label">Affordable now</h2>
          <div className="item-list">
            {summary.affordable.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onTap={() => setViewingItem(item)}
                onMarkBought={() => updateItem(item.id, { status: 'bought' })}
              />
            ))}
          </div>
        </section>
      )}

      {summary.ready.length > 0 && summary.affordable.length === 0 && summary.hasBudget && (
        <section style={{ marginTop: 24 }}>
          <h2 className="section-label">Ready items</h2>
          <div className="item-list">
            {summary.ready.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onTap={() => setViewingItem(item)}
                onMarkBought={() => updateItem(item.id, { status: 'bought' })}
              />
            ))}
          </div>
        </section>
      )}

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
    </div>
  )
}
