import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './app/App';

describe('App shell', () => {
  it('renders heading and canvas editor area', () => {
    const { container } = render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Zooming Indoor Design Tool' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('editor-canvas')).toBeInTheDocument();
    expect(container.querySelector('main')).toHaveClass('overflow-hidden');
  });
});
