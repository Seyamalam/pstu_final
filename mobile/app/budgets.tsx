import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Progress } from 'panelui-native/components/progress';
import { Text } from 'panelui-native/primitives/text';

import { ContentHandoff } from '@/components/content-handoff';
import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import {
  budgetPercent,
  budgetTone,
  monthPeriod,
  periodForBudgetUpsert,
} from '@/lib/budget-state';
import { formatMoney, parseTakaToPoisha, poishaToTakaInput } from '@/lib/format';

function categoryLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

export default function BudgetsScreen() {
  const budgets = useQuery(api.budgets.list, {});
  const categories = useQuery(api.budgets.listCategories, {});
  const wallets = useQuery(api.wallets.list, {});
  const upsert = useMutation(api.budgets.upsert);
  const remove = useMutation(api.budgets.remove);
  const [period] = useState(() => monthPeriod(Date.now()));
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!budgets || !categories || !wallets) return <LoadingState label="Loading budgets" />;
  const currentBudgets = budgets;
  const active = wallets.contexts.find((wallet) => wallet.accountId === wallets.activeAccountId)
    ?? wallets.contexts[0];
  const canManage = active.role !== 'viewer';

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    const existing = currentBudgets.find((budget) => budget.category === nextCategory);
    setAmount(existing ? poishaToTakaInput(existing.limitPoisha) : '');
    setError(null);
  }

  async function save() {
    const limitPoisha = parseTakaToPoisha(amount);
    setError(null);
    if (!category) {
      setError('Choose a category.');
      return;
    }
    if (!limitPoisha) {
      setError('Enter a valid limit.');
      return;
    }
    setSaving(true);
    try {
      const existing = currentBudgets.find((budget) => budget.category === category);
      const selectedPeriod = periodForBudgetUpsert(existing, period, Date.now());
      await upsert({
        category,
        limitPoisha,
        periodStart: selectedPeriod.periodStart,
        periodEnd: selectedPeriod.periodEnd,
      });
      setAmount('');
      setCategory('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save budget.');
    } finally {
      setSaving(false);
    }
  }

  async function removeBudget(budgetId: (typeof currentBudgets)[number]['id']) {
    if (confirmRemoveId !== budgetId) {
      setConfirmRemoveId(budgetId);
      return;
    }
    setError(null);
    setRemovingId(budgetId);
    try {
      await remove({ budgetId });
      setConfirmRemoveId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove budget.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Page title="Budgets">
      <ContentHandoff>
        <Text muted size="sm">{active.name}</Text>
        {currentBudgets.length ? (
          <View className="gap-3">
            {currentBudgets.map((budget) => {
              const percent = budgetPercent(budget.spentPoisha, budget.limitPoisha);
              return (
                <Card key={budget.id}>
                  <Card.Content className="gap-3 pt-6">
                    <Progress
                      value={percent}
                      maxValue={100}
                      label={categoryLabel(budget.category)}
                      valueLabel={`${formatMoney(budget.spentPoisha)} of ${formatMoney(budget.limitPoisha)}`}
                      showValueLabel
                      color={budgetTone(percent)}
                    />
                    <View className="flex-row items-center justify-between gap-3">
                      <Text muted size="sm">{percent.toFixed(0)}% used</Text>
                      {canManage ? (
                        <View className="flex-row gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-12"
                            onPress={() => selectCategory(budget.category)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={confirmRemoveId === budget.id ? 'destructive' : 'ghost'}
                            className="min-h-12"
                            disabled={removingId !== null}
                            onPress={() => void removeBudget(budget.id)}
                          >
                            {removingId === budget.id
                              ? 'Removing'
                              : confirmRemoveId === budget.id
                                ? 'Confirm'
                                : 'Remove'}
                          </Button>
                        </View>
                      ) : null}
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        ) : (
          <MessageCard title="No budgets yet" />
        )}

        {canManage ? (
          <Card>
            <Card.Header>
              <Card.Title>{category ? `Set ${categoryLabel(category)}` : 'Set a budget'}</Card.Title>
            </Card.Header>
            <Card.Content className="gap-4">
              <View className="flex-row flex-wrap gap-2">
                {categories.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={category === option ? 'primary' : 'outline'}
                    className="min-h-12"
                    disabled={saving}
                    onPress={() => selectCategory(option)}
                  >
                    {categoryLabel(option)}
                  </Button>
                ))}
              </View>
              <Input
                value={amount}
                onChangeText={setAmount}
                placeholder="Monthly limit in BDT"
                keyboardType="decimal-pad"
                disabled={saving}
                accessibilityLabel="Monthly budget limit in BDT"
              />
              <Button fullWidth disabled={saving || !category} onPress={() => void save()}>
                {saving ? 'Saving' : 'Save budget'}
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <MessageCard title="View-only budget access" />
        )}
        {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      </ContentHandoff>
    </Page>
  );
}
