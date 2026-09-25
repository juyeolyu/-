"use client";

import { useEffect } from "react";
import { getAnalytics, isSupported } from "firebase/analytics";
import { firebaseApp } from "@/lib/firebase";

export default function FirebaseAnalytics() {
  useEffect(() => {
    let active = true;
    isSupported()
      .then((supported) => {
        if (active && supported) getAnalytics(firebaseApp);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return null;
}
