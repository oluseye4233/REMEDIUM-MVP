import { NextResponse } from 'next/server'
import { z } from 'zod'
import { registerUser } from '@/lib/auth'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  practitioner_type: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, full_name, practitioner_type } = schema.parse(body)
    const data = await registerUser(email, password, practitioner_type, full_name)
    return NextResponse.json({ user: data.user, message: 'Registration successful. Please check your email to confirm.' })
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0].message : (error as Error).message
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
