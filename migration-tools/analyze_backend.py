#!/usr/bin/env python3
"""
Backend Analyzer - Menganalisa struktur Node.js backend untuk migrasi ke Golang
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict

@dataclass
class Route:
    method: str
    path: str
    handler: str
    middleware: List[str]
    controller: str

@dataclass
class Controller:
    name: str
    file: str
    functions: List[str]

@dataclass
class Middleware:
    name: str
    file: str
    description: str

@dataclass
class Service:
    name: str
    file: str
    functions: List[str]

@dataclass
class AnalysisResult:
    routes: List[Route]
    controllers: List[Controller]
    middleware: List[Middleware]
    services: List[Service]
    database_tables: List[str]
    dependencies: Dict[str, str]

class BackendAnalyzer:
    def __init__(self, backend_path: str = "./backend"):
        self.backend_path = Path(backend_path)
        
    def analyze(self) -> AnalysisResult:
        """Analisa seluruh struktur backend"""
        print("🔍 Analyzing backend structure...")
        
        routes = self.analyze_routes()
        controllers = self.analyze_controllers()
        middleware = self.analyze_middleware()
        services = self.analyze_services()
        tables = self.analyze_database_schema()
        deps = self.analyze_dependencies()
        
        return AnalysisResult(
            routes=routes,
            controllers=controllers,
            middleware=middleware,
            services=services,
            database_tables=tables,
            dependencies=deps
        )
    
    def analyze_routes(self) -> List[Route]:
        """Analisa semua routes dari file routes"""
        routes = []
        routes_dir = self.backend_path / "routes"
        
        if not routes_dir.exists():
            return routes
        
        for route_file in routes_dir.glob("*.js"):
            content = route_file.read_text()
            
            # Extract route definitions
            # Pattern: fastify.get('/path', { preHandler: [...] }, handler)
            # Pattern: fastify.post('/path', handler)
            route_patterns = [
                r"fastify\.(get|post|put|delete|patch)\(['\"]([^'\"]+)['\"].*?(\w+Controller\.\w+|\w+)",
                r"router\.(get|post|put|delete|patch)\(['\"]([^'\"]+)['\"].*?(\w+)",
            ]
            
            for pattern in route_patterns:
                matches = re.finditer(pattern, content, re.MULTILINE)
                for match in matches:
                    method = match.group(1).upper()
                    path = match.group(2)
                    handler = match.group(3) if len(match.groups()) >= 3 else "unknown"
                    
                    # Extract middleware
                    middleware_list = []
                    if "preHandler" in content:
                        middleware_matches = re.findall(r'preHandler:\s*\[(.*?)\]', content)
                        for mw in middleware_matches:
                            middleware_list.extend([m.strip() for m in mw.split(',')])
                    
                    routes.append(Route(
                        method=method,
                        path=path,
                        handler=handler,
                        middleware=middleware_list,
                        controller=route_file.stem.replace('Routes', 'Controller')
                    ))
        
        print(f"  ✓ Found {len(routes)} routes")
        return routes
    
    def analyze_controllers(self) -> List[Controller]:
        """Analisa semua controllers"""
        controllers = []
        controllers_dir = self.backend_path / "controllers"
        
        if not controllers_dir.exists():
            return controllers
        
        for controller_file in controllers_dir.glob("*.js"):
            content = controller_file.read_text()
            
            # Extract exported functions
            # Pattern: export async function functionName
            # Pattern: export const functionName = async
            function_patterns = [
                r"export\s+async\s+function\s+(\w+)",
                r"export\s+const\s+(\w+)\s*=\s*async",
                r"export\s+function\s+(\w+)",
            ]
            
            functions = []
            for pattern in function_patterns:
                matches = re.findall(pattern, content)
                functions.extend(matches)
            
            controllers.append(Controller(
                name=controller_file.stem,
                file=str(controller_file.relative_to(self.backend_path)),
                functions=list(set(functions))
            ))
        
        print(f"  ✓ Found {len(controllers)} controllers")
        return controllers
    
    def analyze_middleware(self) -> List[Middleware]:
        """Analisa semua middleware"""
        middleware_list = []
        middleware_dir = self.backend_path / "middleware"
        
        if not middleware_dir.exists():
            return middleware_list
        
        for mw_file in middleware_dir.glob("*.js"):
            content = mw_file.read_text()
            
            # Extract description from comments
            desc_match = re.search(r'/\*\*\s*\n\s*\*\s*(.+?)\n', content)
            description = desc_match.group(1) if desc_match else ""
            
            middleware_list.append(Middleware(
                name=mw_file.stem,
                file=str(mw_file.relative_to(self.backend_path)),
                description=description
            ))
        
        print(f"  ✓ Found {len(middleware_list)} middleware")
        return middleware_list
    
    def analyze_services(self) -> List[Service]:
        """Analisa semua services"""
        services = []
        services_dir = self.backend_path / "services"
        
        if not services_dir.exists():
            return services
        
        for service_file in services_dir.glob("*.js"):
            content = service_file.read_text()
            
            # Extract exported functions and classes
            function_patterns = [
                r"export\s+(?:async\s+)?function\s+(\w+)",
                r"export\s+const\s+(\w+)\s*=",
                r"export\s+class\s+(\w+)",
            ]
            
            functions = []
            for pattern in function_patterns:
                matches = re.findall(pattern, content)
                functions.extend(matches)
            
            services.append(Service(
                name=service_file.stem,
                file=str(service_file.relative_to(self.backend_path)),
                functions=list(set(functions))
            ))
        
        print(f"  ✓ Found {len(services)} services")
        return services
    
    def analyze_database_schema(self) -> List[str]:
        """Analisa database schema dari migration files"""
        tables = []
        migrations_dir = self.backend_path / "database" / "migrations"
        
        if not migrations_dir.exists():
            return tables
        
        for migration_file in migrations_dir.glob("*.js"):
            content = migration_file.read_text()
            
            # Extract CREATE TABLE statements
            table_matches = re.findall(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)', content, re.IGNORECASE)
            tables.extend(table_matches)
        
        # Also check setup.js
        setup_file = self.backend_path / "database" / "setup.js"
        if setup_file.exists():
            content = setup_file.read_text()
            table_matches = re.findall(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)', content, re.IGNORECASE)
            tables.extend(table_matches)
        
        tables = list(set(tables))
        print(f"  ✓ Found {len(tables)} database tables")
        return tables
    
    def analyze_dependencies(self) -> Dict[str, str]:
        """Analisa dependencies dari package.json"""
        package_json = self.backend_path / "package.json"
        
        if not package_json.exists():
            return {}
        
        data = json.loads(package_json.read_text())
        deps = data.get("dependencies", {})
        
        print(f"  ✓ Found {len(deps)} dependencies")
        return deps
    
    def save_analysis(self, result: AnalysisResult, output_file: str = "analysis_result.json"):
        """Simpan hasil analisa ke file JSON"""
        output_path = Path(output_file)
        
        # Convert dataclasses to dict
        data = {
            "routes": [asdict(r) for r in result.routes],
            "controllers": [asdict(c) for c in result.controllers],
            "middleware": [asdict(m) for m in result.middleware],
            "services": [asdict(s) for s in result.services],
            "database_tables": result.database_tables,
            "dependencies": result.dependencies
        }
        
        output_path.write_text(json.dumps(data, indent=2))
        print(f"\n✅ Analysis saved to {output_file}")
    
    def print_summary(self, result: AnalysisResult):
        """Print summary hasil analisa"""
        print("\n" + "="*60)
        print("📊 BACKEND ANALYSIS SUMMARY")
        print("="*60)
        
        print(f"\n📍 Routes: {len(result.routes)}")
        methods = {}
        for route in result.routes:
            methods[route.method] = methods.get(route.method, 0) + 1
        for method, count in sorted(methods.items()):
            print(f"   {method}: {count}")
        
        print(f"\n🎮 Controllers: {len(result.controllers)}")
        for ctrl in result.controllers[:5]:
            print(f"   - {ctrl.name} ({len(ctrl.functions)} functions)")
        if len(result.controllers) > 5:
            print(f"   ... and {len(result.controllers) - 5} more")
        
        print(f"\n🛡️  Middleware: {len(result.middleware)}")
        for mw in result.middleware:
            print(f"   - {mw.name}")
        
        print(f"\n⚙️  Services: {len(result.services)}")
        for svc in result.services[:5]:
            print(f"   - {svc.name} ({len(svc.functions)} functions)")
        if len(result.services) > 5:
            print(f"   ... and {len(result.services) - 5} more")
        
        print(f"\n🗄️  Database Tables: {len(result.database_tables)}")
        for table in sorted(result.database_tables):
            print(f"   - {table}")
        
        print(f"\n📦 Key Dependencies:")
        key_deps = ["fastify", "better-sqlite3", "bcrypt", "jsonwebtoken", "axios"]
        for dep in key_deps:
            if dep in result.dependencies:
                print(f"   - {dep}: {result.dependencies[dep]}")
        
        print("\n" + "="*60)

def main():
    analyzer = BackendAnalyzer("./backend")
    result = analyzer.analyze()
    analyzer.print_summary(result)
    analyzer.save_analysis(result, "migration-tools/analysis_result.json")

if __name__ == "__main__":
    main()
