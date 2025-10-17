import React, { useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function AuthView() {
  const [isLogin, setIsLogin] = useState(true);

  return isLogin ? (
    <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
  ) : (
    <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
  );
}
