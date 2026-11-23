import { Trip, Member, Expense } from '@/types';
import { calculateMemberBalances } from '@/lib/calculations';

export interface MemberFinancialSummary {
  memberId: string;
  memberName: string;
  expensesPaidCount: number;
  expensesPaidTotal: number;
  splitsCount: number;
  splitsTotal: number;
  netBalance: number;
}

/**
 * Summarizes a member's direct payments, splits, and current net balance.
 */
export function getMemberFinancialSummary(trip: Trip, memberId: string): MemberFinancialSummary {
  const member = trip.members.find((m) => m.id === memberId);
  const memberName = member?.name || 'Member';

  let expensesPaidCount = 0;
  let expensesPaidTotal = 0;
  let splitsCount = 0;
  let splitsTotal = 0;

  (trip.expenses || []).forEach((e) => {
    if (e.paidBy === memberId) {
      expensesPaidCount++;
      expensesPaidTotal += e.amount;
    }
    const split = e.splits?.find((s) => s.memberId === memberId);
    if (split) {
      splitsCount++;
      splitsTotal += split.amount;
    }
  });

  const balances = calculateMemberBalances(trip);
  const memberBal = balances.find((b) => b.member.id === memberId);

  return {
    memberId,
    memberName,
    expensesPaidCount,
    expensesPaidTotal: Math.round(expensesPaidTotal * 100) / 100,
    splitsCount,
    splitsTotal: Math.round(splitsTotal * 100) / 100,
    netBalance: memberBal ? Math.round(memberBal.netBalance * 100) / 100 : 0,
  };
}

/**
 * Safely removes a member from the trip, rebalances all expenses and splits,
 * and preserves total ledger equilibrium (sum of net balances == 0).
 */
export function rebalanceTripOnMemberRemoval(
  trip: Trip,
  memberIdToRemove: string,
  fallbackPayerId?: string
): {
  updatedTrip: Trip;
  removedMemberName: string;
  rebalancedExpensesCount: number;
  reassignedPayerCount: number;
} {
  const memberToRemove = trip.members.find((m) => m.id === memberIdToRemove);
  const removedMemberName = memberToRemove?.name || 'Member';

  const remainingMembers = trip.members.filter((m) => m.id !== memberIdToRemove);
  if (remainingMembers.length === 0) {
    throw new Error('A trip group requires at least 1 member.');
  }

  // Designated fallback payer: designated lead (Yagnish Anupam / finance manager / first member)
  const defaultFallbackPayer =
    remainingMembers.find((m) => m.name.toLowerCase().includes('yagnish')) ||
    remainingMembers.find((m) => m.isFinanceLead || m.role === 'finance_manager') ||
    remainingMembers[0];
  const designatedFallbackId = fallbackPayerId || defaultFallbackPayer.id;

  let rebalancedExpensesCount = 0;
  let reassignedPayerCount = 0;

  // 1. Process and rebalance all expenses
  const updatedExpenses: Expense[] = (trip.expenses || []).flatMap((expense) => {
    // If it's a private solo personal expense by this removed member, drop it
    if (expense.isPersonal) {
      const isSoloPersonal =
        expense.splits.length === 1 && expense.splits[0].memberId === memberIdToRemove;
      if (isSoloPersonal || expense.paidBy === memberIdToRemove) {
        return [];
      }
    }

    let updated = { ...expense };

    // A) If the removed member paid for this bill out of pocket
    if (updated.paidBy === memberIdToRemove) {
      updated.paidBy = designatedFallbackId;
      reassignedPayerCount++;
    }

    // B) If the removed member is in the splits
    const hadSplit = updated.splits.some((s) => s.memberId === memberIdToRemove);
    if (hadSplit) {
      rebalancedExpensesCount++;
      const filteredSplits = updated.splits.filter((s) => s.memberId !== memberIdToRemove);

      if (filteredSplits.length === 0) {
        // If the removed member was the sole consumer, assign it to designatedFallbackId
        updated.splits = [{ memberId: designatedFallbackId, amount: updated.amount }];
      } else {
        const remainingCount = filteredSplits.length;
        const totalAmount = updated.amount;

        // Equal split rebalancing
        const isOriginallyEqual =
          updated.splitType === 'equal' ||
          filteredSplits.every((s, _, arr) => Math.abs(s.amount - arr[0].amount) < 0.05);

        if (isOriginallyEqual) {
          const perHead = Math.floor((totalAmount / remainingCount) * 100) / 100;
          let distributedSoFar = 0;
          updated.splits = filteredSplits.map((s, idx) => {
            if (idx === remainingCount - 1) {
              const lastAmt = Math.round((totalAmount - distributedSoFar) * 100) / 100;
              return { memberId: s.memberId, amount: lastAmt };
            }
            distributedSoFar += perHead;
            return { memberId: s.memberId, amount: perHead };
          });
          updated.splitType = 'equal';
        } else {
          // Exact / custom split: re-proportionally distribute across remaining consumers
          const oldSum = filteredSplits.reduce((sum, s) => sum + s.amount, 0);
          if (oldSum <= 0) {
            const perHead = Math.floor((totalAmount / remainingCount) * 100) / 100;
            let distributedSoFar = 0;
            updated.splits = filteredSplits.map((s, idx) => {
              if (idx === remainingCount - 1) {
                return { memberId: s.memberId, amount: Math.round((totalAmount - distributedSoFar) * 100) / 100 };
              }
              distributedSoFar += perHead;
              return { memberId: s.memberId, amount: perHead };
            });
          } else {
            let distributedSoFar = 0;
            updated.splits = filteredSplits.map((s, idx) => {
              if (idx === remainingCount - 1) {
                return { memberId: s.memberId, amount: Math.round((totalAmount - distributedSoFar) * 100) / 100 };
              }
              const ratio = s.amount / oldSum;
              const allocated = Math.round(totalAmount * ratio * 100) / 100;
              distributedSoFar += allocated;
              return { memberId: s.memberId, amount: allocated };
            });
          }
        }
      }
    }

    return [updated];
  });

  // 2. Clean up settlements involving the removed member
  const updatedSettlements = (trip.settlements || []).filter(
    (s) => s.fromMemberId !== memberIdToRemove && s.toMemberId !== memberIdToRemove
  );

  // 3. Clean up collection rounds status
  const updatedCollectionRounds = (trip.collectionRounds || []).map((round) => {
    if (!round.memberStatus || !round.memberStatus[memberIdToRemove]) return round;
    const newStatus = { ...round.memberStatus };
    delete newStatus[memberIdToRemove];
    return { ...round, memberStatus: newStatus };
  });

  // 4. Clean up payments
  const updatedPayments = (trip.payments || []).map((p) => {
    if (p.matchedMemberId === memberIdToRemove) {
      return { ...p, matchedMemberId: designatedFallbackId };
    }
    return p;
  });

  // 5. Clean up Hub awards votes and itinerary leads
  const updatedAwards = (trip.awards || []).map((aw) => {
    if (!aw.votes || !aw.votes[memberIdToRemove]) return aw;
    const newVotes = { ...aw.votes };
    delete newVotes[memberIdToRemove];
    return { ...aw, votes: newVotes };
  });

  const updatedItineraryDays = (trip.itineraryDays || []).map((day) => ({
    ...day,
    activities: (day.activities || []).map((act) =>
      act.leadMemberId === memberIdToRemove
        ? { ...act, leadMemberId: undefined }
        : act
    ),
  }));

  // 6. Lead resolution
  const newFinanceLeadId =
    trip.financeLeadId === memberIdToRemove ? designatedFallbackId : trip.financeLeadId;

  const updatedTrip: Trip = {
    ...trip,
    members: remainingMembers,
    expenses: updatedExpenses,
    settlements: updatedSettlements,
    collectionRounds: updatedCollectionRounds,
    payments: updatedPayments,
    awards: updatedAwards,
    itineraryDays: updatedItineraryDays,
    financeLeadId: newFinanceLeadId,
  };

  return {
    updatedTrip,
    removedMemberName,
    rebalancedExpensesCount,
    reassignedPayerCount,
  };
}

/**
 * Safely adds a new member to the trip.
 * If `includeInExistingGroupExpenses` is true, re-splits all non-personal equal group expenses
 * to include the new member.
 */
export function rebalanceTripOnMemberAddition(
  trip: Trip,
  newMember: Member,
  includeInExistingGroupExpenses: boolean
): {
  updatedTrip: Trip;
  rebalancedExpensesCount: number;
} {
  const updatedMembers = [...trip.members, newMember];

  if (!includeInExistingGroupExpenses || !trip.expenses || trip.expenses.length === 0) {
    return {
      updatedTrip: {
        ...trip,
        members: updatedMembers,
      },
      rebalancedExpensesCount: 0,
    };
  }

  let rebalancedExpensesCount = 0;
  const previousMemberCount = trip.members.length;

  const updatedExpenses = trip.expenses.map((expense) => {
    if (expense.isPersonal) return expense;

    // Check if expense was shared equally among the group
    const wasSplitAmongAll =
      expense.splitType === 'equal' ||
      expense.splits.length === previousMemberCount;

    if (!wasSplitAmongAll) return expense;

    rebalancedExpensesCount++;
    const newParticipantIds = Array.from(new Set([...expense.splits.map((s) => s.memberId), newMember.id]));
    const newCount = newParticipantIds.length;
    const totalAmount = expense.amount;

    const perHead = Math.floor((totalAmount / newCount) * 100) / 100;
    let distributedSoFar = 0;
    const newSplits = newParticipantIds.map((memberId, idx) => {
      if (idx === newCount - 1) {
        const lastAmt = Math.round((totalAmount - distributedSoFar) * 100) / 100;
        return { memberId, amount: lastAmt };
      }
      distributedSoFar += perHead;
      return { memberId, amount: perHead };
    });

    return {
      ...expense,
      splitType: 'equal' as const,
      splits: newSplits,
    };
  });

  return {
    updatedTrip: {
      ...trip,
      members: updatedMembers,
      expenses: updatedExpenses,
    },
    rebalancedExpensesCount,
  };
}
