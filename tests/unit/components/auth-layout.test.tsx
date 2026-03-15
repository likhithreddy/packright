/**
 * Unit tests for src/components/features/auth/AuthLayout.tsx
 *
 * Tests the AuthLayout component which provides the layout structure
 * for authentication pages.
 */

import { render, screen } from '@testing-library/react';
import { AuthLayout } from '@/components/features/auth/AuthLayout';

describe('AuthLayout', () => {
  it('should render children content', () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Auth Form</div>
      </AuthLayout>
    );

    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
    expect(screen.getByText('Auth Form')).toBeInTheDocument();
  });

  it('should display PackRight branding', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    expect(screen.getByText('PackRight')).toBeInTheDocument();
  });

  it('should display tagline', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    expect(screen.getByText(/Join thousands of travelers/)).toBeInTheDocument();
    expect(screen.getByText(/eliminated the chaos of group packing/)).toBeInTheDocument();
  });

  it('should display copyright with current year', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} PackRight Inc\\.`))).toBeInTheDocument();
  });

  it('should render back to home links', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const backLinks = screen.getAllByText(/Home|Back to Home/);
    expect(backLinks.length).toBeGreaterThan(0);
  });

  it('should have proper responsive classes', () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    // Check for responsive class patterns
    expect(container.querySelector('.lg\\:flex')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:w-1\\/2')).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    render(
      <AuthLayout>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </AuthLayout>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('should handle null children gracefully', () => {
    const { container } = render(<AuthLayout>{null}</AuthLayout>);

    expect(container).toBeInTheDocument();
  });

  it('should handle undefined children', () => {
    const { container } = render(<AuthLayout>{undefined}</AuthLayout>);

    expect(container).toBeInTheDocument();
  });

  it('should apply proper viewport constraints', () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const layout = container.firstChild as HTMLElement;
    expect(layout).toHaveClass('h-screen');
    expect(layout).toHaveClass('w-screen');
  });

  it('should have overflow-hidden on main container', () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const layout = container.firstChild as HTMLElement;
    expect(layout).toHaveClass('overflow-hidden');
  });

  it('should render decorative background gradient', () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const gradient = container.querySelector('.from-primary\\/10');
    expect(gradient).toBeInTheDocument();
  });

  it('should use serif font for branding title', () => {
    const { container } = render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const title = container.querySelector('.font-serif.text-4xl');
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('PackRight');
  });

  it('should handle empty fragment children', () => {
    const { container } = render(
      <AuthLayout>
        <></>
      </AuthLayout>
    );

    expect(container).toBeInTheDocument();
  });

  it('should render mobile-specific back button', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    // Mobile back button has specific classes
    const mobileButtons = screen.getAllByText('Home');
    expect(mobileButtons.length).toBeGreaterThan(0);
  });

  it('should wrap children in proper container with max-width', () => {
    const { container } = render(
      <AuthLayout>
        <div data-testid="child">Content</div>
      </AuthLayout>
    );

    // The container should have max-w-[850px] class
    const wrapper = container.querySelector('[class*="max-w-"]');
    expect(wrapper).toBeInTheDocument();
  });

  it('should preserve layout structure with complex children', () => {
    render(
      <AuthLayout>
        <div>
          <h1>Form Title</h1>
          <input type="text" />
          <button type="submit">Submit</button>
        </div>
      </AuthLayout>
    );

    expect(screen.getByText('Form Title')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });
});
