"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isPending = form.formState.isSubmitting;

  const onSubmit = async (values: LoginFormValues) => {
    await authClient.signIn.email(
      {
        email: values.email,
        password: values.password,
        callbackURL: "/",
      },
      {
        onSuccess: () => {
          router.push("/");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
      },
    );
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-center"
    >
      <Card className="w-[420px] bg-[#111111] border-[#222222] text-white rounded-lg">
        <CardHeader className="space-y-2 flex flex-col items-center">
          <CardTitle className="text-2xl font-semibold tracking-tighter">
            Welcome back
          </CardTitle>
          <CardDescription className="text-[#a1a1aa] tracking-tight">
            Login to continue to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* OAuth Buttons */}
              <div className="flex gap-3">
                {/* Google */}
                <Button
                  variant="outline"
                  className="flex-1 border-[#222222] bg-transparent hover:bg-[#1a1a1a]"
                  type="button"
                  disabled={isPending}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-white"
                  >
                    <path d="M12 2a9.96 9.96 0 0 1 6.29 2.226a1 1 0 0 1 .04 1.52l-1.51 1.362a1 1 0 0 1 -1.265 .06a6 6 0 1 0 2.103 6.836h-3.66a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1h6.945a1 1 0 0 1 .994 .89c.04 .367 .061 .737 .061 1.11c0 5.523 -4.477 10 -10 10s-10 -4.477 -10 -10s4.477 -10 10 -10z" />
                  </svg>
                </Button>

                {/* GitHub */}
                <Button
                  variant="outline"
                  className="flex-1 border-[#222222] bg-transparent hover:bg-[#1a1a1a]"
                  type="button"
                  disabled={isPending}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-white"
                  >
                    <path d="M5.315 2.1c.791 -.113 1.9 .145 3.333 .966l.272 .161l.16 .1l.397 -.083a13.3 13.3 0 0 1 4.59 -.08l.456 .08l.396 .083l.161 -.1c1.385 -.84 2.487 -1.17 3.322 -1.148l.164 .008l.147 .017l.076 .014l.05 .011l.144 .047a1 1 0 0 1 .53 .514a5.2 5.2 0 0 1 .397 2.91l-.047 .267l-.046 .196l.123 .163c.574 .795 .93 1.728 1.03 2.707l.023 .295l.007 .272c0 3.855 -1.659 5.883 -4.644 6.68l-.245 .061l-.132 .029l.014 .161l.008 .157l.004 .365l-.002 .213l-.003 3.834a1 1 0 0 1 -.883 .993l-.117 .007h-6a1 1 0 0 1 -.993 -.883l-.007 -.117v-.734c-1.818 .26 -3.03 -.424 -4.11 -1.878l-.535 -.766c-.28 -.396 -.455 -.579 -.589 -.644a1 1 0 0 1 .564 -1.918c.642 .188 1.074 .568 1.57 1.239l.538 .769c.76 1.079 1.36 1.459 2.609 1.191v-.678a5.03 5.03 0 0 1 -.021 -.824l.017 -.185l-.108 -.024c-2.976 -.71 -4.703 -2.573 -4.875 -6.139l-.01 -.31a5.6 5.6 0 0 1 .908 -3.051l.122 -.163l-.045 -.196a5.2 5.2 0 0 1 .145 -2.642l.1 -.282a1 1 0 0 1 .529 -.514l.154 -.03z" />
                  </svg>
                </Button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <Separator className="flex-1 bg-[#222222]" />
                <span className="text-xs text-[#4b5563]">OR</span>
                <Separator className="flex-1 bg-[#222222]" />
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          autoComplete="email"
                          disabled={isPending}
                          className="bg-transparent border-[#222222] focus-visible:border-white focus-visible:ring-0 placeholder:text-[#4b5563] text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
                          type="password"
                          autoComplete="current-password"
                          disabled={isPending}
                          className="bg-transparent border-[#222222] focus-visible:border-white focus-visible:ring-0 placeholder:text-[#4b5563] text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <motion.p
                    className="text-sm font-medium text-red-500 text-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {form.formState.errors.root.message}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-white text-black font-semibold hover:bg-gray-200"
                  disabled={isPending}
                >
                  {isPending ? "Logging in..." : "Login"}
                </Button>
              </div>
            </form>
          </Form>

          {/* Footer Links */}
          <div className="space-y-2">
            <p className="text-sm text-center text-[#a1a1aa]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="underline underline-offset-4 text-white"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
