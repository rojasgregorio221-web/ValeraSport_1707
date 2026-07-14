# -*- coding: utf-8 -*-
import re
import base64

def ofuscar_codigo():
    try:
        # 1. Leer el archivo index.html original
        with open('index.html', 'r', encoding='utf-8') as f:
            contenido = f.read()

        # 2. Encontrar el bloque de script interactivo
        match = re.search(r'(<script[^>]*>)(.*?)(</script>)', contenido, re.DOTALL | re.IGNORECASE)
        
        if not match:
            print("❌ No se encontró ninguna etiqueta <script> en tu archivo index.html.")
            return

        etiqueta_apertura = match.group(1)
        js_original = match.group(2)
        etiqueta_cierre = match.group(3)

        # Si ya está ofuscado, evitamos re-ofuscarlo
        if "eval(atob(" in js_original:
            print("⚠️ El código ya parece estar ofuscado o protegido.")
            return

        print("🛡️ Iniciando cifrado y ofuscación del código JavaScript...")

        # 3. Cifrar todo el JavaScript interno
        js_bytes = js_original.encode('utf-8')
        js_base64 = base64.b64encode(js_bytes).decode('utf-8')

        # 4. Crear el cargador seguro (ofuscado)
        js_ofuscado = f'''
        // CODIGO PROTEGIDO - VALERA SPORT (PROPIEDAD PRIVADA)
        const _0x5a1e = "{js_base64}";
        eval(decodeURIComponent(atob(_0x5a1e).split('').map(function(c) {{
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }}).join('')));
        '''

        # Reemplazar en el contenido del HTML
        nuevo_contenido = contenido.replace(js_original, js_ofuscado)

        # 5. Guardar como index_protegido.html
        with open('index_protegido.html', 'w', encoding='utf-8') as f:
            f.write(nuevo_contenido)

        print("\n✅ ¡ÉXITO TOTAL!")
        print("📁 Se ha generado el archivo: 'index_protegido.html'")
        print("🔒 El código ahora es ilegible para curiosos, pero funciona exactamente igual.")
        print("💡 CONSEJO: Mantén tu 'index.html' limpio para editar, y usa 'index_protegido.html' para la nube.")

    except FileNotFoundError:
        print("❌ Error: No se encontró 'index.html' en esta carpeta.")
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")

if __name__ == '__main__':
    ofuscar_codigo()