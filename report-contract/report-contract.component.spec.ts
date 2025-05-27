import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { ReportContractComponent } from './report-contract.component'

describe('ReportContractComponent', () => {
	let component: ReportContractComponent
	let fixture: ComponentFixture<ReportContractComponent>

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ReportContractComponent],
			teardown: { destroyAfterEach: false },
		}).compileComponents()
	}))

	beforeEach(() => {
		fixture = TestBed.createComponent(ReportContractComponent)
		component = fixture.componentInstance
		fixture.detectChanges()
	})

	it('should create', () => {
		expect(component).toBeTruthy()
	})
})
