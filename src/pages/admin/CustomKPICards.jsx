import React, { useState } from 'react';
import { ClipboardList, Star, Gift, CheckCircle2, Clock, Flag, MoreVertical } from "lucide-react";

export default function CustomKPICards({ kpiData, totalEmployees }) {
  const {
    total = 0,
    reviewed = 0,
    pending = 0,
    bonusCount = 0,
    averageRating = null,
    multiEvalCount = 0,
    multiEvalNames = [],
    multiBonusCount = 0,
    multiBonusNames = []
  } = kpiData || {};

  const completionPercent = totalEmployees > 0 ? Math.round((total / totalEmployees) * 100) : 0;
  const reviewedPercent = total > 0 ? ((reviewed / total) * 100).toFixed(1) : 0;
  const pendingPercent = total > 0 ? ((pending / total) * 100).toFixed(1) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      
      {/* 1. REVIEWS CARD */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative flex flex-col">
        <div className="p-4 pb-3 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-slate-900 font-bold text-[15px]">Reviews</h3>
                <p className="text-slate-500 text-[11px]">Submitted reviews</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="relative h-10 w-10 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-purple-600" strokeDasharray={`${completionPercent}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-purple-700 font-bold text-[10px]">{completionPercent}%</span>
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">Completion</span>
            </div>
          </div>

          <div className="mb-2 flex justify-between items-start">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-slate-900 tracking-tight">{total}</span>
                <span className="text-slate-400 font-medium text-sm">/ {totalEmployees}</span>
              </div>
              {multiEvalCount > 0 && (
                <div className="group/multi relative cursor-pointer inline-flex items-center mt-1">
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">
                    {multiEvalCount} emp in &gt;1 proj
                  </span>
                  <div className="absolute left-0 top-full pt-1.5 z-50 hidden group-hover/multi:block">
                    <div className="min-w-[180px] whitespace-normal rounded-xl border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-700 shadow-xl">
                      <div className="font-semibold text-slate-900 mb-1 border-b border-slate-100 pb-1">Employees in multiple projects:</div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {multiEvalNames.map(name => <li key={name}>{name}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 border-l border-dashed border-slate-200 pl-4">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="font-bold text-lg text-slate-900 leading-none">{reviewed}</span>
                </div>
                <p className="text-[10px] text-emerald-600 font-medium">Reviewed</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="font-bold text-lg text-slate-900 leading-none">{pending}</span>
                </div>
                <p className="text-[10px] text-amber-600 font-medium">Pending Review</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wavy background bottom */}
        <div className="h-10 bg-purple-50/30 w-full mt-auto relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, #d8b4fe 0%, transparent 50%), radial-gradient(circle at 0% 100%, #e9d5ff 0%, transparent 50%)' }}></div>
        </div>
      </div>

      {/* 2. AVG RATING CARD */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative flex flex-col">
        <div className="p-4 pb-3 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              <div className="h-9 w-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h3 className="text-slate-900 font-bold text-[15px]">Avg Rating</h3>
                <p className="text-slate-500 text-[11px]">Across all reviews</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-slate-900 tracking-tight">{averageRating ? averageRating.toFixed(2) : "-"}</span>
              <span className="text-slate-400 font-medium text-sm">/ 5</span>
            </div>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className={`w-5 h-5 ${averageRating && averageRating >= star ? "text-orange-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 text-[10px] font-bold">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            +0.25 vs last month
          </div>
        </div>

        <div className="h-10 bg-orange-50/30 w-full relative overflow-hidden mt-auto">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-100/50 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-orange-50 rounded-full blur-xl"></div>
        </div>
      </div>

      {/* 3. BONUS SUGGESTED CARD */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative flex flex-col">
        <div className="p-4 pb-3 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              <div className="h-9 w-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <h3 className="text-slate-900 font-bold text-[15px]">Bonus Suggested</h3>
                <p className="text-slate-500 text-[11px]">Flagged by PMs</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-2">
            <div className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">{bonusCount}</div>
            
            {multiBonusCount > 0 && (
              <div className="group/multi relative cursor-pointer inline-flex items-center">
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md">
                  {multiBonusCount} emp in &gt;1 proj
                </span>
                <div className="absolute left-0 top-full pt-1.5 z-50 hidden group-hover/multi:block">
                  <div className="min-w-[180px] whitespace-normal rounded-xl border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-700 shadow-xl">
                    <div className="font-semibold text-slate-900 mb-1 border-b border-slate-100 pb-1">Bonus in multiple projects:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {multiBonusNames.map(name => <li key={name}>{name}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-10 bg-teal-50/30 w-full relative overflow-hidden mt-auto">
           <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-100/40 rounded-full blur-3xl"></div>
        </div>
      </div>

    </div>
  );
}
