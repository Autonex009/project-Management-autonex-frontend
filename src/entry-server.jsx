// IMPORTANT: ssr-globals must be the first import so its browser-global stubs
// are installed before App's module graph is evaluated (ES imports run in order).
import './ssr-globals';

import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';

// Called once per request by the server (server.js in dev, api/ssr.js on Vercel).
// StaticRouter is the SSR counterpart to BrowserRouter — it takes the requested
// URL as a prop instead of reading window.location (which does not exist here).
// cookieHeader is accepted now but only becomes load-bearing in Phase 2
// (cookie-based auth); Phase 1 renders public pages fully and protected pages
// as empty (ProtectedRoute's <Navigate> renders null during renderToString).
export function render(url, cookieHeader, ssrAuth, dehydratedState) {
  const html = renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <App ssrAuth={ssrAuth} dehydratedState={dehydratedState} />
      </StaticRouter>
    </React.StrictMode>
  );
  return { html };
}

import { QueryClient, dehydrate } from '@tanstack/react-query';
import { runWithSsrToken } from './ssr-globals';
import { onboardingApi } from './services/api';

export async function prefetch(url, token, user) {
  return runWithSsrToken(token, async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 1000 * 60 } }
    });

    try {
      // Admin Onboarding Pages
      if (url.startsWith('/admin/modules') && !url.includes('/new')) {
        await queryClient.prefetchQuery({
          queryKey: ['admin-modules'],
          queryFn: () => onboardingApi.getModules(true)
        });
      } else if (url.startsWith('/admin/modules/new')) {
        const editIdMatch = url.match(/edit=([^&]+)/);
        if (editIdMatch) {
          await queryClient.prefetchQuery({
            queryKey: ['module', editIdMatch[1]],
            queryFn: () => onboardingApi.getModule(editIdMatch[1])
          });
        }
      } else if (url.startsWith('/admin/onboarding-reports')) {
        await queryClient.prefetchQuery({
          queryKey: ['admin-reports', 1, ''],
          queryFn: () => onboardingApi.getReports(1, 10, '')
        });
      } else if (url.startsWith('/admin/newly-onboarded')) {
        await queryClient.prefetchQuery({
          queryKey: ['newly-onboarded', 1, ''],
          queryFn: () => onboardingApi.getNewlyOnboarded(1, 10, '')
        });
      }

      // PM Onboarding Pages
      else if (url.startsWith('/pm/onboarding-mentor')) {
        // Prefetch mentees (PMOnboardingDashboard default tab)
        if (user?.id) {
          await queryClient.prefetchQuery({
            queryKey: ['pm-mentees', user.id, 1, ''],
            queryFn: () => onboardingApi.getMentees(user.id, 1, 10, '')
          });
        }
        // Prefetch newly onboarded (fallback/second tab)
        await queryClient.prefetchQuery({
          queryKey: ['newly-onboarded', 1, ''],
          queryFn: () => onboardingApi.getNewlyOnboarded(1, 10, '')
        });
      }

      // Employee Onboarding Pages
      else if (url.startsWith('/employee/onboarding')) {
        // Module View
        const match = url.match(/\/employee\/onboarding\/([^/?]+)/);
        if (match) {
          const moduleId = match[1];
          if (user && user.id) {
            await Promise.all([
              queryClient.prefetchQuery({
                queryKey: ['module', moduleId],
                queryFn: () => onboardingApi.getModule(moduleId)
              }),
              queryClient.prefetchQuery({
                queryKey: ['module-progress', user.id],
                queryFn: () => onboardingApi.getProgress(user.id)
              })
            ]);
          }
        } else {
          // Dashboard
          if (user && user.id) {
            await Promise.all([
              queryClient.prefetchQuery({
                queryKey: ['modules-list'],
                queryFn: () => onboardingApi.getModules(false)
              }),
              queryClient.prefetchQuery({
                queryKey: ['module-progress', user.id],
                queryFn: () => onboardingApi.getProgress(user.id)
              })
            ]);
          }
        }
      }
    } catch (e) {
      console.error('SSR Prefetch Error:', e);
    }

    return dehydrate(queryClient);
  });
}
