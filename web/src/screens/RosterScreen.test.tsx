import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Settings, TeamMember } from '@shared/types.js';
import { DEFAULT_SETTINGS } from '@shared/constants.js';

const members: TeamMember[] = [
  {
    id: 'm1',
    name: 'Arshad',
    role: 'Dev',
    locationGroup: 'MY',
    capacityPercent: 70,
    additionalDevBuffer: true,
    isScrumMaster: false,
    active: true,
  },
];

vi.mock('../api/client.js', () => ({
  api: {
    listMembers: vi.fn(async () => members),
    getSettings: vi.fn(async (): Promise<Settings> => DEFAULT_SETTINGS),
    createMember: vi.fn(async () => members[0]),
    updateMember: vi.fn(async () => members[0]),
    setScrumMaster: vi.fn(async () => members),
    deactivateMember: vi.fn(async () => members[0]),
    updateSettings: vi.fn(async () => DEFAULT_SETTINGS),
  },
}));

import { api } from '../api/client.js';
import { RosterScreen } from './RosterScreen.js';
import { ToastProvider } from '../ui/kit.js';

const renderScreen = () =>
  render(
    <ToastProvider>
      <RosterScreen />
    </ToastProvider>,
  );

describe('RosterScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the seed member', async () => {
    renderScreen();
    expect(await screen.findByTestId('member-row-Arshad')).toBeInTheDocument();
  });

  it('blocks adding a member with no name', async () => {
    renderScreen();
    await screen.findByTestId('roster-table');
    await userEvent.click(screen.getByTestId('add-member'));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(api.createMember).not.toHaveBeenCalled();
  });

  it('adds a valid member', async () => {
    renderScreen();
    await screen.findByTestId('roster-table');
    await userEvent.type(screen.getByTestId('new-member-name'), 'Nimal');
    await userEvent.click(screen.getByTestId('add-member'));
    await waitFor(() => expect(api.createMember).toHaveBeenCalled());
  });
});
