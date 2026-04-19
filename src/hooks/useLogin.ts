// src/hooks/useLogin.ts
import {useForm, UseFormReturn} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {z} from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import { userLogin } from '@/services/auth/auth.api'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSafeRedirectUrl } from '@/utils/navigation'

const LoginSchema = z.object({
    username: z.string().min(1, "Tên đăng nhập không được để trống"),
    password: z.string().min(1, "Mật khẩu không được để trống")
})

type LoginFormType = z.infer<typeof LoginSchema>

interface UseLoginReturn {
    form: UseFormReturn<LoginFormType>,
    handleLogin: (data: LoginFormType) => Promise<void>
    isLoading: boolean
}

export const useLogin = (): UseLoginReturn => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {setTokens, setUser} = useAuthStore()

    const redirectUrl = searchParams.get('redirect')

    const form = useForm<LoginFormType>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {username: '', password: ''}
    })

    const handleLogin = async (data: LoginFormType) => {
        try {
            const res = await userLogin(data)

            try {
                setTokens(res.accessToken, res.refreshToken)
                setUser(res.user)
            } catch (error) {
                console.error('Lỗi lưu trữ: ', error)
                throw new Error('Không thể lưu thông tin đăng nhập')
            }    

            const destination = getSafeRedirectUrl(redirectUrl, res.user.role)

            router.push(destination)
            router.refresh()
        } catch (error) {
            const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Đăng nhập thất bại, vui lòng thử lại'
            form.setError('root',{message})
        }    
    }

    return {form, handleLogin, isLoading: form.formState.isSubmitting}
}