import logoWhite from '../../assets/digifnb-logo-white.png';

type BrandLogoProps = {
  variant?: 'sidebar' | 'hero';
  className?: string;
};

export function BrandLogo({ variant = 'sidebar', className = '' }: BrandLogoProps) {
  return (
    <div className={`brand-logo-wrap brand-logo-wrap--${variant} ${className}`.trim()}>
      <img
        src={logoWhite}
        alt="DigiFNB"
        className={`brand-logo-img brand-logo-img--${variant}`}
      />
    </div>
  );
}
