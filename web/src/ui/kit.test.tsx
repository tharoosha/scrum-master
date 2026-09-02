import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, RoleTag, roleRowClass, n2 } from './kit.js';

describe('n2', () => {
  it('rounds to 2 dp', () => {
    expect(n2(60.9615)).toBe('60.96');
    expect(n2(23.70725)).toBe('23.71');
    expect(n2(10)).toBe('10');
  });
});

describe('StatusBadge', () => {
  it('renders the status text and class', () => {
    render(<StatusBadge status="Over" />);
    const el = screen.getByTestId('status-badge-Over');
    expect(el).toHaveTextContent('Over');
    expect(el).toHaveClass('badge', 'Over');
  });
});

describe('role highlighting', () => {
  it('QA rows get the role-qa class, Dev rows do not', () => {
    expect(roleRowClass('QA')).toBe('role-qa');
    expect(roleRowClass('Dev')).toBeUndefined();
  });

  it('RoleTag carries a role-specific class', () => {
    const { container } = render(<RoleTag role="QA" />);
    expect(container.firstChild).toHaveClass('role-tag', 'QA');
  });
});
