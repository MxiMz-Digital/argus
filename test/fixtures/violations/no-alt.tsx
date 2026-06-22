// Fixture: triggers SEO3:image-no-alt and SEO3:image-empty-alt
import Image from 'next/image'

export default function Page() {
  return (
    <div>
      <Image src="/hero.jpg" width={800} height={400} />
      <Image src="/logo.png" width={200} height={80} alt="" />
      <Image src="/team.jpg" width={400} height={300} alt="image" />
    </div>
  )
}
