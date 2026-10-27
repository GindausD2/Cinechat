import { PrivacyImage } from "./privacy-image";
export function Avatar({ name, image, className = "avatar" }: { name: string; image?: string | null; className?: string }) {
  return <span className={className} role="img" aria-label={`${name} avatar`}><span aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>{image && <PrivacyImage src={image} alt="" fill sizes="100px" />}</span>;
}
