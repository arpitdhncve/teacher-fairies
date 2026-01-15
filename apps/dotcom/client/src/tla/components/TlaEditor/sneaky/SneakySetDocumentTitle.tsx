import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { useMaybeApp } from '../../../hooks/useAppState'
import { useMsg } from '../../../utils/i18n'
import { editorMessages as messages } from '../editor-messages'
import { MODULES } from '../../../../pages/courseData'

export function SneakySetDocumentTitle() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const app = useMaybeApp()
	const editor = useGlobalEditor()
	const untitledProject = useMsg(messages.untitledProject)
	
	const title = useValue(
		'title',
		() => {
			if (!fileSlug || !app) {
				return editor?.getDocumentSettings().name ?? untitledProject
			}

			const file = app.getFile(fileSlug)
			if (!file) {
				return editor?.getDocumentSettings().name ?? untitledProject
			}

			if (file.createSource?.startsWith('lf/')) {
				const createSource = file.createSource.replace('lf/', '')
				
				// Strategy 1: Look up by URL (most reliable if available)
				const url = localStorage.getItem(`learning_material_url:lf/${createSource}`)


				if (url) {
					// Search MODULES for this URL
					for (const module of MODULES) {
						// Check concepts
						for (const concept of module.concepts) {
							if (concept.conceptUrl === url) {

								return concept.name
							}
							// Check case studies
							for (const cs of concept.caseStudies) {
								if (cs.url === url) {

									return cs.title
								}
							}
						}
					}
				}

				// Strategy 2: ID Parsing (Fallback)
				const typeAndId = createSource // concept_123 or case_study_...


				if (typeAndId) {
					if (typeAndId.startsWith('concept_')) {
						const idNum = parseInt(typeAndId.replace('concept_', ''), 10)

						// Search modules for this concept - this assumes IDs are unique/global or match the module structure
						// If IDs are per-module in MODULES but global in the file, this might fail unless we check all
						for (const module of MODULES) {
							const concept = module.concepts.find(c => c.id === idNum)
							if (concept) {

								return concept.name
							}
						}
					} else if (typeAndId.startsWith('case_study_')) {
						// Try to match complex ID first
						const suffix = typeAndId.replace('case_study_', '')
						if (suffix.includes('-cs-')) {
							const [cIdStr, csIdxStr] = suffix.split('-cs-')
							const cId = parseInt(cIdStr, 10)
							const csIdx = parseInt(csIdxStr, 10)
							
							if (!isNaN(cId) && !isNaN(csIdx)) {
								for (const module of MODULES) {
									const concept = module.concepts.find(c => c.id === cId)
									if (concept && concept.caseStudies[csIdx]) {
										return concept.caseStudies[csIdx].title
									}
								}
							}
						} else {
							// Try to match plain integer ID if the complex format fails
							// This is a guess since we don't have IDs on case studies in MODULES
							// But if the user sees 'Case Study 2', maybe it's just the 2nd case study globally?
							// Unlikely to map easily without more info.
						}
					}
				}
			}

			return (app.getFileName(fileSlug, false) ?? editor?.getDocumentSettings().name) || untitledProject
		},
		[app, editor, fileSlug, untitledProject]
	)

	if (!title) return null
	return <Helmet title={app ? title : `${title} • tldraw`} />
}
