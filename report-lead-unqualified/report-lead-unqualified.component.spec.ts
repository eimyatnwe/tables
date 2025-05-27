import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { ReportLeadUnqualifiedComponent } from './report-lead-unqualified.component'

describe('ReportLeadUnqualifiedComponent', () => {
	let component: ReportLeadUnqualifiedComponent
	let fixture: ComponentFixture<ReportLeadUnqualifiedComponent>

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ReportLeadUnqualifiedComponent],
			teardown: { destroyAfterEach: false },
		}).compileComponents()
	}))

	beforeEach(() => {
		fixture = TestBed.createComponent(ReportLeadUnqualifiedComponent)
		component = fixture.componentInstance
		fixture.detectChanges()
	})

	it('should create', () => {
		expect(component).toBeTruthy()
	})
})
