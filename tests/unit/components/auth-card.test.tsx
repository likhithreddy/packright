/**
 * Unit tests for src/components/features/auth/AuthCard.tsx
 *
 * Tests the AuthCard component which provides consistent styling
 * for authentication-related forms.
 */

import { render, screen } from '@testing-library/react';
import { AuthCard } from '@/components/features/auth/AuthCard';

describe('AuthCard', () => {
  it('should render title and description', () => {
    render(
      <AuthCard title="Sign In" description="Enter your credentials">
        <div>Form Content</div>
      </AuthCard>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Enter your credentials')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(
      <AuthCard title="Test" description="Test description">
        <button type="submit">Submit</button>
        <input type="text" placeholder="Username" />
      </AuthCard>
    );

    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });

  it('should apply custom CSS classes', () => {
    const { container } = render(
      <AuthCard title="Test" description="Test">
        <div>Content</div>
      </AuthCard>
    );

    const card = container.querySelector('.border-border\\/50');
    expect(card).toBeInTheDocument();
  });

  it('should use serif font for title', () => {
    const { container } = render(
      <AuthCard title="Test Title" description="Test description">
        <div>Content</div>
      </AuthCard>
    );

    const title = container.querySelector('.font-serif');
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Test Title');
  });

  it('should render multiple children', () => {
    render(
      <AuthCard title="Test" description="Test description">
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </AuthCard>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('should handle empty children', () => {
    const { container } = render(
      <AuthCard title="Test" description="Test description">
        {null}
      </AuthCard>
    );

    expect(container).toBeInTheDocument();
  });

  it('should handle undefined description', () => {
    render(
      <AuthCard title="Test" description={undefined}>
        <div>Content</div>
      </AuthCard>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle special characters in title and description', () => {
    render(
      <AuthCard title="Test & Description" description="Description with special chars">
        <div>Content</div>
      </AuthCard>
    );

    expect(screen.getByText('Test & Description')).toBeInTheDocument();
    expect(screen.getByText('Description with special chars')).toBeInTheDocument();
  });

  it('should render long title text', () => {
    const longTitle =
      'This is a very long title that should wrap properly across multiple lines without breaking the layout';
    render(
      <AuthCard title={longTitle} description="Test description">
        <div>Content</div>
      </AuthCard>
    );

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('should render long description text', () => {
    const longDescription =
      'This is a very long description that provides detailed information about what the user should expect and should wrap properly across multiple lines';
    render(
      <AuthCard title="Test" description={longDescription}>
        <div>Content</div>
      </AuthCard>
    );

    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it('should handle HTML entities in text', () => {
    render(
      <AuthCard title="Test &amp; Test" description="Test &lt;tag&gt;">
        <div>Content</div>
      </AuthCard>
    );

    expect(screen.getByText('Test & Test')).toBeInTheDocument();
    expect(screen.getByText('Test <tag>')).toBeInTheDocument();
  });
});
