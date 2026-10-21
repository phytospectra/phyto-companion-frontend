"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginPage } from "@/auth/LoginPage";
import { useAuth } from "@/auth/AuthProvider";

export default function LoginRoute() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/upload");
  }, [status, router]);

  return <LoginPage />;
}
