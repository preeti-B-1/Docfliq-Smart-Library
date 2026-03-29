from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    ADMIN_EMAIL: str
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ALLOWED_DOMAINS: str = "gmail.com,docfliq.com"
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    

    @property
    def allowed_domains_list(self) -> list[str]:
        return [d.strip().lower() for d in self.ALLOWED_DOMAINS.split(",") if d.strip()]

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def jwt_secret_clean(self) -> str:
        return self.JWT_SECRET.strip()

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
