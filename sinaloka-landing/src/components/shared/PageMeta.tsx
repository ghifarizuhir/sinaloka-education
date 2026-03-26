import { BASE_URL } from "../../lib/constants";

interface PageMetaProps {
  title: string;
  description: string;
  canonicalPath: string;
  ogTitle?: string;
  ogDescription?: string;
}

export function PageMeta({
  title,
  description,
  canonicalPath,
  ogTitle,
  ogDescription,
}: PageMetaProps) {
  const fullUrl = BASE_URL + canonicalPath;
  const resolvedOgTitle = ogTitle ?? title;
  const resolvedOgDescription = ogDescription ?? description;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      <link rel="alternate" hrefLang="id" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={resolvedOgTitle} />
      <meta property="og:description" content={resolvedOgDescription} />
      <meta property="og:image" content={`${BASE_URL}/og-image.png`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Sinaloka — Platform Manajemen Bimbel" />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:site_name" content="Sinaloka" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedOgTitle} />
      <meta name="twitter:description" content={resolvedOgDescription} />
      <meta name="twitter:image" content={`${BASE_URL}/og-image.png`} />
    </>
  );
}
