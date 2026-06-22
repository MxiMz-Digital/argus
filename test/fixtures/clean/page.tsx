// Fixture: clean page — should produce zero violations
import Image from 'next/image'
import { PageHero } from '@mximz/ui'

export const metadata = {
  title: 'Association Directory | NRI Associations',
  description: 'Find NRI associations worldwide.',
}

export const revalidate = 3600

export default function AssociationsPage() {
  return (
    <main>
      <PageHero title="Association Directory" />
      <section>
        <Image
          src="/images/associations-hero.jpg"
          alt="NRI associations across the globe"
          width={1200}
          height={600}
          priority
        />
      </section>
    </main>
  )
}
