"use client";
import { useEffect } from "react";
export function CoursePreferenceTracker({courseId}:{courseId:string}){useEffect(()=>{try{localStorage.setItem("studyhub_course_preference",courseId)}catch{}},[courseId]);return null}
