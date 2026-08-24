import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';

import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customer-detail";
import Orders from "@/pages/orders";
import Inbox from "@/pages/inbox";
import Goals from "@/pages/goals";
import Todos from "@/pages/todos";
import Arenden from "@/pages/arenden";
import Settings from "@/pages/settings"
import GoogleHub from "@/pages/google-hub";
import ImportPage from "@/pages/import";
import Login from "@/pages/login";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [location] = useLocation()

  if (loading) return null
  if (!user && location !== "/login") return <Redirect to="/login" />
  return <>{children}</>
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <AuthGuard>
          <Layout>
            <RoutedErrorBoundary>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/customers" component={Customers} />
                <Route path="/customers/:id" component={CustomerDetail} />
                <Route path="/orders" component={Orders} />
                <Route path="/inbox" component={Inbox} />
                <Route path="/todos" component={Todos} />
                <Route path="/arenden" component={Arenden} />
                <Route path="/goals" component={Goals} />
                <Route path="/import" component={ImportPage} />
                <Route path="/google" component={GoogleHub} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </RoutedErrorBoundary>
          </Layout>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
