import { DangApp } from "@/components/dang/dang-app";
import { DangProvider } from "@/lib/dang/store";

export default function Home() {
  return (
    <DangProvider>
      <DangApp />
    </DangProvider>
  );
}
