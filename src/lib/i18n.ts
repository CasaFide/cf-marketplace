import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Navigation
      "home": "Home",
      "dashboard": "Dashboard",
      "login": "Login",
      "signup": "Sign Up",
      "logout": "Logout",
      "profile": "Profile",
      
      // Auth
      "email": "Email",
      "password": "Password",
      "confirmPassword": "Confirm Password",
      "fullName": "Full Name",
      "signInWithGoogle": "Sign in with Google",
      "signInWithMicrosoft": "Sign in with Microsoft",
      "alreadyHaveAccount": "Already have an account?",
      "dontHaveAccount": "Don't have an account?",
      "forgotPassword": "Forgot password?",
      
      // Homepage
      "heroTitle": "Find Your Perfect Rental",
      "heroSubtitle": "Discover amazing homes and apartments in your dream location",
      "searchPlaceholder": "Where do you want to live?",
      "featuredProperties": "Featured Properties",
      "howItWorks": "How It Works",
      "searchStep": "Search for properties",
      "matchStep": "Match with hosts",
      "moveStep": "Move in and enjoy",
      
      // Dashboard
      "myMatches": "My Matches",
      "activeRentals": "Active Rentals",
      "pendingRequests": "Pending Requests",
      "noMatches": "No matches yet",
      "status": "Status",
      "pending": "Pending",
      "accepted": "Accepted",
      "rejected": "Rejected",
      "active": "Active",
      "completed": "Completed",
      
      // Property
      "property": "Property",
      "bedrooms": "Bedrooms",
      "bathrooms": "Bathrooms",
      "guests": "Guests",
      "perMonth": "per month",
      "viewDetails": "View Details",
      
      // Common
      "loading": "Loading...",
      "error": "Error",
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "back": "Back",
      "next": "Next",
      "previous": "Previous"
    }
  },
  pt: {
    translation: {
      // Navigation
      "home": "Início",
      "dashboard": "Painel",
      "login": "Entrar",
      "signup": "Cadastrar",
      "logout": "Sair",
      "profile": "Perfil",
      
      // Auth
      "email": "E-mail",
      "password": "Senha",
      "confirmPassword": "Confirmar Senha",
      "fullName": "Nome Completo",
      "signInWithGoogle": "Entrar com Google",
      "signInWithMicrosoft": "Entrar com Microsoft",
      "alreadyHaveAccount": "Já tem uma conta?",
      "dontHaveAccount": "Não tem uma conta?",
      "forgotPassword": "Esqueceu a senha?",
      
      // Homepage
      "heroTitle": "Encontre Seu Aluguel Perfeito",
      "heroSubtitle": "Descubra casas e apartamentos incríveis na sua localização dos sonhos",
      "searchPlaceholder": "Onde você quer morar?",
      "featuredProperties": "Propriedades em Destaque",
      "howItWorks": "Como Funciona",
      "searchStep": "Busque propriedades",
      "matchStep": "Conecte-se com anfitriões",
      "moveStep": "Mude-se e aproveite",
      
      // Dashboard
      "myMatches": "Meus Matches",
      "activeRentals": "Aluguéis Ativos",
      "pendingRequests": "Solicitações Pendentes",
      "noMatches": "Nenhum match ainda",
      "status": "Status",
      "pending": "Pendente",
      "accepted": "Aceito",
      "rejected": "Rejeitado",
      "active": "Ativo",
      "completed": "Concluído",
      
      // Property
      "property": "Propriedade",
      "bedrooms": "Quartos",
      "bathrooms": "Banheiros",
      "guests": "Hóspedes",
      "perMonth": "por mês",
      "viewDetails": "Ver Detalhes",
      
      // Common
      "loading": "Carregando...",
      "error": "Erro",
      "save": "Salvar",
      "cancel": "Cancelar",
      "delete": "Excluir",
      "edit": "Editar",
      "back": "Voltar",
      "next": "Próximo",
      "previous": "Anterior"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;